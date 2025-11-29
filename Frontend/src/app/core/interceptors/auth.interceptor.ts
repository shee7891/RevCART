import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Inject services at the top level (injection context)
  const router = inject(Router);
  const authService = inject(AuthService);

  // Get token from localStorage
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('revcart_token') : null;

  // Clone request and add Authorization header if token exists
  let clonedRequest = req;
  if (token) {
    clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(clonedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Token expired or invalid
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('revcart_token');
          localStorage.removeItem('revcart_user');
        }
        authService.logout();
        router.navigate(['/auth/login']);
      } else if (error.status === 403) {
        // Access forbidden
        router.navigate(['/']);
      }
      return throwError(() => error);
    })
  );
};
