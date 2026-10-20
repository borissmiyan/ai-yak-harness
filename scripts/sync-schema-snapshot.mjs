#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * 🔄 Supabase Schema Snapshot Synchronizer (AI Harness Tier-2)
 *
 * Extracts table and column names from live database or generates snapshot
 * from Supabase CLI / OpenAPI / Database Types.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SNAPSHOT_PATH = path.join(ROOT_DIR, 'supabase', 'schema_snapshot.json');

function loadEnv() {
    const envPaths = ['.env', '.env.local', '.env.development'];
    const envVars = { ...process.env };

    for (const file of envPaths) {
        const fullPath = path.join(ROOT_DIR, file);
        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            for (const line of content.split('\n')) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                    const idx = trimmed.indexOf('=');
                    const key = trimmed.slice(0, idx).trim();
                    let val = trimmed.slice(idx + 1).trim();
                    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                        val = val.slice(1, -1);
                    }
                    if (!envVars[key]) envVars[key] = val;
                }
            }
        }
    }
    return envVars;
}

export async function syncSchemaSnapshot(options = {}) {
    console.log('🔄 [Schema Snapshot] Синхронизация золотого снимка схемы...');

    if (options.snapshotData) {
        fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(options.snapshotData, null, 2), 'utf8');
        console.log(`✅ [Schema Snapshot] Снимок сохранен в ${SNAPSHOT_PATH}`);
        return options.snapshotData;
    }

    const env = loadEnv();
    const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY;

    if (supabaseUrl && serviceRoleKey) {
        try {
            const res = await fetch(`${supabaseUrl}/rest/v1/`, {
                headers: {
                    apikey: serviceRoleKey,
                    Authorization: `Bearer ${serviceRoleKey}`,
                },
            });
            if (res.ok) {
                const spec = await res.json();
                const definitions = spec.definitions || {};
                const tables = {};

                for (const [tableName, def] of Object.entries(definitions)) {
                    if (def && typeof def === 'object' && def.properties) {
                        tables[tableName] = {
                            columns: Object.keys(def.properties),
                        };
                    }
                }

                if (Object.keys(tables).length > 0) {
                    const snapshot = {
                        version: '1.0',
                        updated_at: new Date().toISOString(),
                        tables,
                    };
                    fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), 'utf8');
                    console.log(`✅ [Schema Snapshot] Успешно загружено ${Object.keys(tables).length} таблиц через PostgREST.`);
                    return snapshot;
                }
            }
        } catch (err) {
            console.warn('⚠️ [Schema Snapshot] Ошибка запроса к PostgREST:', err?.message || err);
        }
    }

    // If already exists, return current
    if (fs.existsSync(SNAPSHOT_PATH)) {
        try {
            const data = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
            console.log(`ℹ️ [Schema Snapshot] Использован существующий снимок (${Object.keys(data.tables || {}).length} таблиц).`);
            return data;
        } catch {
            // ignore
        }
    }

    console.warn('⚠️ [Schema Snapshot] Не удалось обновить снимок с удаленной БД. Файл не изменен.');
    return null;
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    syncSchemaSnapshot().catch(err => {
        console.error('❌ [Schema Snapshot] Ошибка:', err);
        process.exit(1);
    });
}
