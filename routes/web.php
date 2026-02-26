<?php

use Illuminate\Support\Facades\Route;

Route::view('/{path?}', 'react')
    ->where('path', '^(?!api|up).*$');
