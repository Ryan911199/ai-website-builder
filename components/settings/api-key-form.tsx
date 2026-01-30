'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export function ApiKeyForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [claudeKey, setClaudeKey] = useState('');
  const [minimaxKey, setMinimaxKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('claude');

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        setClaudeKey(data.claudeApiKey || '');
        setMinimaxKey(data.minimaxApiKey || '');
        setSelectedProvider(data.selectedProvider || 'claude');
      })
      .catch((err) => {
        console.error('Failed to load settings', err);
        toast.error('Failed to load settings');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claudeApiKey: claudeKey,
          minimaxApiKey: minimaxKey,
          selectedProvider,
        }),
      });

      if (!res.ok) throw new Error('Failed to save');

      toast.success('Settings saved successfully');
    } catch (err) {
      console.error('Failed to save settings', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading settings...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Provider Settings</CardTitle>
        <CardDescription>
          Configure your API keys and select the default provider.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="provider">Default Provider</Label>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger id="provider">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude">Anthropic (Claude)</SelectItem>
                <SelectItem value="minimax">MiniMax</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="claude-key">Anthropic API Key</Label>
            <Input
              id="claude-key"
              type="password"
              value={claudeKey}
              onChange={(e) => setClaudeKey(e.target.value)}
              placeholder="sk-ant-..."
            />
            <p className="text-xs text-muted-foreground">
              Required for Claude models.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minimax-key">MiniMax API Key</Label>
            <Input
              id="minimax-key"
              type="password"
              value={minimaxKey}
              onChange={(e) => setMinimaxKey(e.target.value)}
              placeholder="Enter your MiniMax API key"
            />
            <p className="text-xs text-muted-foreground">
              Required for MiniMax models.
            </p>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
