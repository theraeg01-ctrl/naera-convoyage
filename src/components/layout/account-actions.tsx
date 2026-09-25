import { Repeat2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { SignOutButton } from "./navigation";

/** Changer de profil / se déconnecter (portails sans menu « Plus »). */
export function AccountActions() {
  return (
    <div className="grid grid-cols-2 gap-2">
      <ButtonLink href="/" variant="secondary" size="sm">
        <Repeat2 aria-hidden />
        Changer de profil
      </ButtonLink>
      <SignOutButton />
    </div>
  );
}
