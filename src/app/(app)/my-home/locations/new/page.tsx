import { PageHeader } from "@/components/ui/page";
import { LocationForm } from "../../location-form";

export const metadata = { title: "Add room" };

export default function NewLocationPage() {
  return (
    <>
      <PageHeader back={{ href: "/my-home", label: "My Home" }} title="Add a room or area" />
      <LocationForm />
    </>
  );
}
