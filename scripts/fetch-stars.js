#!/usr/bin/env node
/**
 * 抓取用户的 GitHub Stars 并生成 data/github-stars.json
 */

const fs = require('fs');
const path = require('path');

const OWNER = 'HanphoneJan';
const DATA_FILE = path.join(__dirname, '..', 'data', 'github-stars.json');

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'hanphonejan-stars-fetcher',
          'Accept': 'application/vnd.github+json',
          ...(options.token && { 'Authorization': `Bearer ${options.token}` }),
          ...options.headers
        }
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`  Retry ${i + 1}/${retries} after error: ${error.message}`);
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

async function fetchStars(token) {
  const repos = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const url = `https://api.github.com/users/${OWNER}/starred?per_page=${perPage}&page=${page}`;
    console.log(`Fetching page ${page}...`);

    try {
      const data = await fetchWithRetry(url, { token });

      if (!Array.isArray(data)) {
        console.error('❌ Unexpected response format:', typeof data);
        break;
      }

      repos.push(...data.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
        description: repo.description || '',
        url: repo.html_url,
        stars: repo.stargazers_count,
        language: repo.language,
        topics: repo.topics || [],
        updatedAt: repo.updated_at
      })));

      console.log(`  Got ${data.length} repos`);

      if (data.length < perPage) break;
      page++;
      await new Promise(r => setTimeout(r, 500));
    } catch (error) {
      console.error(`❌ Error fetching page ${page}:`, error.message);
      break;
    }
  }

  return repos;
}

async function main() {
  console.log(`🔍 Fetching stars for ${OWNER}...`);

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.log('ℹ️ No GITHUB_TOKEN set, using unauthenticated requests (60/hour limit)');
  }

  try {
    const repos = await fetchStars(token);
    console.log(`\n📦 Total: ${repos.length} starred repositories`);

    const output = {
      lastUpdated: new Date().toISOString(),
      count: repos.length,
      repositories: repos
    };

    fs.writeFileSync(DATA_FILE, JSON.stringify(output, null, 2) + '\n');
    console.log(`✅ Written to ${DATA_FILE}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
