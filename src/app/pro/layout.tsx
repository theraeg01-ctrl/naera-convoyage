import { PortalLayout } from "@/components/layout/portal-layout";

export default function Layout({ children }: LayoutProps<"/pro">) {
  return <PortalLayout portal="pro">{children}</PortalLayout>;
}
