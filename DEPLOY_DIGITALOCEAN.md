# Deploy QuinsAI to a DigitalOcean VPS

This guide assumes Ubuntu 24.04, Nginx, PHP-FPM, PostgreSQL, Node.js, and Composer.
Replace `YOUR_DOMAIN_OR_IP`, `YOUR_PORT`, and database credentials with your values.

## 1. Create the Droplet

Create an Ubuntu droplet on DigitalOcean and SSH into it:

```bash
ssh root@YOUR_SERVER_IP
```

## 2. Install server packages

```bash
apt update && apt upgrade -y
apt install -y nginx postgresql postgresql-contrib git unzip curl supervisor
apt install -y php8.3-fpm php8.3-cli php8.3-pgsql php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip php8.3-bcmath php8.3-intl
```

Install Composer:

```bash
curl -sS https://getcomposer.org/installer | php
mv composer.phar /usr/local/bin/composer
```

Install Node.js:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
```

## 3. Create PostgreSQL database

```bash
sudo -u postgres psql
```

Inside PostgreSQL:

```sql
CREATE DATABASE quinsai;
CREATE USER quinsai_user WITH ENCRYPTED PASSWORD 'root';
GRANT ALL PRIVILEGES ON DATABASE quinsai TO quinsai_user;
\q
```

## 4. Upload or clone the app

Put the project at `/var/www/quinsai`.

Example using Git:

```bash
mkdir -p /var/www
cd /var/www
git clone YOUR_REPOSITORY_URL quinsai
cd quinsai
```

## 5. Configure Laravel

```bash
cp .env.example .env
nano .env
```

Recommended production values:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=http://YOUR_DOMAIN_OR_IP:YOUR_PORT
FRONTEND_URL=http://YOUR_DOMAIN_OR_IP:YOUR_PORT

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=quinsai
DB_USERNAME=quinsai_user
DB_PASSWORD=CHANGE_THIS_PASSWORD

AUTH_REFRESH_COOKIE_SECURE=false
```

If you use HTTPS later, set:

```env
APP_URL=https://YOUR_DOMAIN
FRONTEND_URL=https://YOUR_DOMAIN
AUTH_REFRESH_COOKIE_SECURE=true
```

Also fill in required app secrets such as `HEYGEN_API_KEY`, `HEYGEN_WEBHOOK_SECRET`,
and `ADMIN_PASSWORD`.

## 6. Install dependencies and build assets

```bash
composer install --no-dev --optimize-autoloader
npm ci
npm run build
php artisan key:generate
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Set permissions:

```bash
chown -R www-data:www-data /var/www/quinsai
chmod -R 775 storage bootstrap/cache
```

## 7. Configure Nginx on a custom port

Create the Nginx site:

```bash
nano /etc/nginx/sites-available/quinsai
```

Use this config:

```nginx
server {
    listen YOUR_PORT;
    server_name YOUR_DOMAIN_OR_IP;
    root /var/www/quinsai/public;

    index index.php index.html;

    client_max_body_size 260M;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
    }

    location ~ /\.ht {
        deny all;
    }
}
```

Enable it:

```bash
ln -s /etc/nginx/sites-available/quinsai /etc/nginx/sites-enabled/quinsai
nginx -t
systemctl reload nginx
```

Open the port in the firewall:

```bash
ufw allow OpenSSH
ufw allow YOUR_PORT/tcp
ufw --force enable
```

Your app should now be available at:

```text
http://YOUR_DOMAIN_OR_IP:YOUR_PORT
```

## 8. Run the queue worker

Because this app uses `QUEUE_CONNECTION=database`, run a queue worker with Supervisor:

```bash
nano /etc/supervisor/conf.d/quinsai-worker.conf
```

Use:

```ini
[program:quinsai-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/quinsai/artisan queue:work database --sleep=3 --tries=3 --timeout=120
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=1
redirect_stderr=true
stdout_logfile=/var/www/quinsai/storage/logs/worker.log
stopwaitsecs=3600
```

Start it:

```bash
supervisorctl reread
supervisorctl update
supervisorctl start quinsai-worker:*
```

## 9. Deploy future updates

Run these after pulling new code:

```bash
cd /var/www/quinsai
git pull
composer install --no-dev --optimize-autoloader
npm ci
npm run build
php artisan migrate --force
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
supervisorctl restart quinsai-worker:*
systemctl reload nginx
```

