import React, { useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Wifi, WifiOff, RefreshCw, Settings, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export const CJSettings: React.FC = () => {
    const testConnection = useAction(api.cjActions.testConnection);
    const configureWebhooks = useAction(api.cjActions.configureWebhooks);
    const syncTracking = useAction(api.cjActions.syncTracking);

    const [testing, setTesting] = useState(false);
    const [configuring, setConfiguring] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleTestConnection = async () => {
        setTesting(true);
        setResult(null);
        try {
            const res = await testConnection({});
            setResult(res);
        } catch (error: any) {
            setResult({ success: false, message: error.message });
        } finally {
            setTesting(false);
        }
    };

    const handleConfigureWebhooks = async () => {
        setConfiguring(true);
        setResult(null);
        try {
            const res = await configureWebhooks({});
            setResult(res);
        } catch (error: any) {
            setResult({ success: false, message: error.message });
        } finally {
            setConfiguring(false);
        }
    };

    const handleSyncTracking = async () => {
        setSyncing(true);
        setResult(null);
        try {
            const res = await syncTracking({});
            setResult({
                success: true,
                message: `Synced ${res.synced} orders${res.errors > 0 ? `, ${res.errors} errors` : ''}`
            });
        } catch (error: any) {
            setResult({ success: false, message: error.message });
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h2 className="font-serif text-3xl text-earth mb-2">CJ Dropshipping</h2>
                <p className="text-earth/50 text-sm">Configure CJ Dropshipping integration settings</p>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Test Connection */}
                <div className="bg-white rounded-lg border border-earth/10 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Wifi className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-earth">API Connection</h3>
                            <p className="text-xs text-earth/50">Test CJ API access</p>
                        </div>
                    </div>
                    <button
                        onClick={handleTestConnection}
                        disabled={testing}
                        className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                    >
                        {testing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Wifi className="w-4 h-4" />
                        )}
                        {testing ? 'Testing...' : 'Test Connection'}
                    </button>
                </div>

                {/* Configure Webhooks */}
                <div className="bg-white rounded-lg border border-earth/10 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <Settings className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-earth">Webhooks</h3>
                            <p className="text-xs text-earth/50">Enable real-time updates</p>
                        </div>
                    </div>
                    <button
                        onClick={handleConfigureWebhooks}
                        disabled={configuring}
                        className="w-full py-2 px-4 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                    >
                        {configuring ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Settings className="w-4 h-4" />
                        )}
                        {configuring ? 'Configuring...' : 'Configure Webhooks'}
                    </button>
                </div>

                {/* Sync Tracking */}
                <div className="bg-white rounded-lg border border-earth/10 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <RefreshCw className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-earth">Tracking Sync</h3>
                            <p className="text-xs text-earth/50">Fetch latest tracking info</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSyncTracking}
                        disabled={syncing}
                        className="w-full py-2 px-4 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                    >
                        {syncing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                        {syncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                </div>
            </div>

            {/* Result Message */}
            {result && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${result.success
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {result.success ? (
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    ) : (
                        <XCircle className="w-5 h-5 flex-shrink-0" />
                    )}
                    <span>{result.message}</span>
                </div>
            )}

            {/* Info Box */}
            <div className="mt-8 p-6 bg-cream/30 rounded-lg border border-earth/10">
                <h4 className="font-medium text-earth mb-3">How It Works</h4>
                <ul className="space-y-2 text-sm text-earth/70">
                    <li className="flex items-start gap-2">
                        <span className="font-medium text-earth">1.</span>
                        <span><strong>Test Connection</strong> - Verify your CJ API credentials are working</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="font-medium text-earth">2.</span>
                        <span><strong>Configure Webhooks</strong> - Enable real-time order updates (requires verified store)</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="font-medium text-earth">3.</span>
                        <span><strong>Sync Tracking</strong> - Manually fetch tracking info (also runs automatically every 4 hours)</span>
                    </li>
                </ul>
                <div className="mt-4 p-3 bg-amber-50 rounded border border-amber-200 text-amber-700 text-sm">
                    <strong>Note:</strong> Your CJ store needs to be verified before the API will work.
                    Contact CJ support via their online chat if you see authentication errors.
                </div>
            </div>
        </div>
    );
};
