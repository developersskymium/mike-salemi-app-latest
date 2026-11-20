import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";
import { Glass } from "@/components/ui";

/** Sign in / sign up / reset frame: Mike's photography beside (desktop) or behind (phone) a glass card. */
export function AuthShell({ photo, alt, title, lede, children, footer }: { photo: StaticImageData; alt: string; title: string; lede?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="dsc-auth">
      <div className="dsc-auth-photo">
        <Image src={photo} alt={alt} fill priority sizes="(min-width: 1024px) 50vw, 100vw" placeholder="blur" />
      </div>
      <div className="dsc-auth-side">
        <Glass level="thick" radius="hero" className="dsc-auth-card">
          <h1 className="lq-t34">{title}</h1>
          {lede && <p className="lq-t15 lq-c2">{lede}</p>}
          {children}
        </Glass>
        {footer && <div className="dsc-auth-foot lq-t15">{footer}</div>}
      </div>
    </div>
  );
}
