import type { SVGProps } from "react";

/**
 * A round pet ID tag on its ring: the Pets section's mark. Drawn to sit with
 * the 24px, 2px-stroke icons used elsewhere in the navigation.
 */
export function PetTagIcon({ strokeWidth = 2, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="4.25" r="2.25" />
      <path d="M12 6.5v1.75" />
      <circle cx="12" cy="15" r="6.75" />
      <path d="M9.25 14h5.5M10.25 17h3.5" />
    </svg>
  );
}
