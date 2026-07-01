import { AppShell } from "../../../components/app-shell";
import { ProfilePanel } from "./profile-panel";

export default function ProfilePage() {
  return (
    <AppShell title="Profile">
      <section className="page-header">
        <h2>Account</h2>
        <p>North Properties account</p>
      </section>
      <ProfilePanel />
    </AppShell>
  );
}
