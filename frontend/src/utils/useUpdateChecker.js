import { useEffect, useState } from 'react';

export const CURRENT_VERSION = '1.0.0';

const LATEST_RELEASE_URL = 'https://api.github.com/repos/LASCA/LASCA/releases/latest';

const isVersionNewer = (latestVersion, currentVersion) => {
  const parseVersion = (version) => {
    const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)$/i);
    return match ? match.slice(1).map(Number) : null;
  };

  const latest = parseVersion(latestVersion);
  const current = parseVersion(currentVersion);

  if (!latest || !current) {
    throw new Error(`Invalid version tag: ${latestVersion}`);
  }

  for (let index = 0; index < latest.length; index += 1) {
    if (latest[index] !== current[index]) {
      return latest[index] > current[index];
    }
  }

  return false;
};

export default function useUpdateChecker() {
  const [update, setUpdate] = useState({
    hasUpdate: false,
    latestVersion: '',
    downloadUrl: '',
    changelog: '',
    loading: true,
    error: '',
  });

  useEffect(() => {
    const controller = new AbortController();

    const checkForUpdate = async () => {
      try {
        const token = import.meta.env.VITE_GITHUB_TOKEN;

        const headers = {
          'Accept': 'application/vnd.github+json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        };

        const response = await fetch(LATEST_RELEASE_URL, {
          headers,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`GitHub API request failed (${response.status}).`);
        }

        const release = await response.json();
        const latestVersion = release.tag_name || '';

        setUpdate({
          hasUpdate: isVersionNewer(latestVersion, CURRENT_VERSION),
          latestVersion,
          downloadUrl: release.assets?.[0]?.browser_download_url || release.html_url || '',
          changelog: release.body || '',
          loading: false,
          error: '',
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          setUpdate((previous) => ({
            ...previous,
            loading: false,
            error: error.message || 'Unable to check for updates.',
          }));
        }
      }
    };

    checkForUpdate();
    return () => controller.abort();
  }, []);

  return update;
}