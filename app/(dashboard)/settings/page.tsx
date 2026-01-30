import { ApiKeyForm } from '@/components/settings/api-key-form';

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      <div className="max-w-2xl">
        <ApiKeyForm />
      </div>
    </div>
  );
}
