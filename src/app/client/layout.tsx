import { PortalLayout } from "@/components/layout/portal-layout";

export default function Layout({ children }: LayoutProps<"/client">) {
  return <PortalLayout portal="client">{children}</PortalLayout>;
}
