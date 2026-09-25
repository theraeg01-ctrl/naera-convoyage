import { PortalLayout } from "@/components/layout/portal-layout";

export default function Layout({ children }: LayoutProps<"/driver">) {
  return <PortalLayout portal="driver">{children}</PortalLayout>;
}
