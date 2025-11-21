import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', fullWidth, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-bg',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          {
            // Variants - Dark mode optimized
            'bg-gradient-to-r from-gradient-pink-start to-gradient-pink-end text-white hover:opacity-90 shadow-lg shadow-gradient-pink-start/20': variant === 'primary',
            'bg-dark-card text-white border border-dark-border hover:border-ordak-gray-400 hover:bg-dark-card-hover': variant === 'secondary',
            'bg-gradient-to-r from-gradient-green-start to-gradient-green-end text-white hover:opacity-90 shadow-lg shadow-gradient-green-start/20': variant === 'success',
            'bg-gradient-to-r from-ordak-red-primary to-ordak-red-light text-white hover:opacity-90 shadow-lg shadow-ordak-red-primary/20': variant === 'danger',
            // Sizes
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-5 py-2.5 text-sm': size === 'md',
            'px-8 py-3 text-base': size === 'lg',
            // Width
            'w-full': fullWidth,
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
