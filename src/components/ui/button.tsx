import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border font-medium whitespace-nowrap select-none transition-[background-color,border-color,color,opacity] disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary-hover active:opacity-90',
        secondary:
          'border-border bg-raised text-foreground shadow-xs hover:bg-muted active:bg-muted',
        ghost: 'border-transparent text-foreground hover:bg-muted active:bg-muted',
        danger: 'border-transparent bg-danger text-surface hover:opacity-90',
        link: 'border-transparent px-0! text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-2.5 text-[13px]',
        md: 'h-9 px-3.5 text-sm',
        lg: 'h-11 px-5 text-[15px]',
        icon: 'size-9 text-sm',
        'icon-sm': 'size-8 text-sm',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

type Props = ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild, type, ...props }: Props) {
  const Component = asChild ? Slot.Root : 'button';
  return (
    <Component
      className={cn(buttonVariants({ variant, size }), className)}
      type={asChild ? undefined : (type ?? 'button')}
      {...props}
    />
  );
}
