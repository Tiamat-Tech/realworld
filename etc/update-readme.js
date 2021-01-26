#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const jsYaml = require('js-yaml');

if (!process.env.GH_TOKEN) {
  throw new Error('GH_TOKEN environment variable needs to be specified.');
}
axios.defaults.baseURL = 'https://api.github.com';
axios.defaults.headers.common['Authorization'] = `token ${process.env.GH_TOKEN}`;

const README_TEMPLATE_FILE = '../README.template.md';
const README_TARGET_FILE = '../README.md';

const FRONTEND_PLACEHOLDER = 'INSERT_FRONTEND_REPOS';
const BACKEND_PLACEHOLDER = 'INSERT_BACKEND_REPOS';
const MOBILE_PLACEHOLDER = 'INSERT_MOBILE_REPOS';
const FULLSTACK_PLACEHOLDER = 'INSERT_FULLSTACK_REPOS';

const FRONTEND_WIP_PLACEHOLDER = 'INSERT_FRONTEND_WIP';
const BACKEND_WIP_PLACEHOLDER = 'INSERT_BACKEND_WIP';
const MOBILE_WIP_PLACEHOLDER = 'INSERT_MOBILE_WIP';
const FULLSTACK_WIP_PLACEHOLDER = 'INSERT_FULLSTACK_WIP';

const FRONTEND_REPOS = jsYaml.safeLoad(fs.readFileSync('frontend-repos.yaml', 'utf8'));
const BACKEND_REPOS = jsYaml.safeLoad(fs.readFileSync('backend-repos.yaml', 'utf8'));
const MOBILE_REPOS = jsYaml.safeLoad(fs.readFileSync('mobile-repos.yaml', 'utf8'));
const FULLSTACK_REPOS = jsYaml.safeLoad(fs.readFileSync('fullstack-repos.yaml', 'utf8'));

(async () => {
  await main();
})();

async function main() {

  const input = fs.readFileSync(README_TEMPLATE_FILE, 'utf8').split("\n");
  const output = [
    '<!-- ',
    '      NOTE: This file is autogenerated!!!',
    '            Please do not directly edit this file.',
    '            Instead, please edit: README.template.md',
    '-->',
  ];
  for (let i = 0; i < input.length; ++i) {
    if (input[i].includes(FRONTEND_PLACEHOLDER)) {
      output.push(...(await getSortedTable(FRONTEND_REPOS)));
    } else if (input[i].includes(BACKEND_PLACEHOLDER)) {
      output.push(...(await getSortedTable(BACKEND_REPOS)));
    } else if (input[i].includes(MOBILE_PLACEHOLDER)) {
      output.push(...(await getSortedTable(MOBILE_REPOS)));
    } else if (input[i].includes(FULLSTACK_PLACEHOLDER)) {
      output.push(...(await getSortedTable(FULLSTACK_REPOS)));
    } else if (input[i].includes(FRONTEND_WIP_PLACEHOLDER)) {
      output.push(await getWIPProjects('frontend'));
    } else if (input[i].includes(BACKEND_WIP_PLACEHOLDER)) {
      output.push(await getWIPProjects('backend'));
    } else if (input[i].includes(MOBILE_WIP_PLACEHOLDER)) {
      output.push(await getWIPProjects('mobile'));
    } else if (input[i].includes(FULLSTACK_WIP_PLACEHOLDER)) {
      output.push(await getWIPProjects('fullstack'));
    } else {
      output.push(input[i]);
    }
  }
  fs.writeFileSync(README_TARGET_FILE, output.join('\n'));
  console.log(`Wrote output to file: [${README_TARGET_FILE}]`);

}

async function getSortedTable(repos) {

  // Get sorted repos by stargazers_count
  for (let i = 0; i < repos.length; ++i) {
    let repoData = null;
    try {
      repoData = await axios.get(`/repos/${repos[i].repo}`);
    } catch(err) {
      console.warn(`Error fetching data for: ${repos[i].repo}`);
      repos[i].stargazers_count = -1;
      continue;
    }
    repos[i].stargazers_count = repoData.data.stargazers_count;
  }
  repos = repos.sort((a, b) => b.stargazers_count - a.stargazers_count);
  console.log('\n\nSorted repos: \n\n' + repos.map(e => `  ${e.repo} (${e.stargazers_count})`).join('\n') + '\n\n');

  // Output sorted table
  const output = [];

  // Add comment showing ranking to ease merges
  output.push('<!--');
  output.push('  Ranking:');
  const repoRankings = repos.map((e, i) => 
    `    ${(i+1).toString().padStart(2)}: ${e.title}`);
  output.push(...repoRankings);
  output.push('-->');

  // Add header
  output.push(...[
    `> _Sorted by popularity on ${(new Date()).toDateString()}_`,
    '',
    '| 🥇 | 🥈 | 🥉 |',
    '| :---:         |     :---:      |          :---: |',
  ]);

  // Add sorted table
  let string = '';
  for (let i = 0; i < Math.max(repos.length, 3); ++i) {
    if (i <= repos.length - 1) {
      string += `| [**${repos[i].title}**<br/> ` +
      `![${repos[i].title}](${repos[i].logo}) ` +
      `![Star](https://img.shields.io/github/stars/${repos[i].repo}.svg?style=social&label=Star) ` +
      `![Fork](https://img.shields.io/github/forks/${repos[i].repo}.svg?style=social&label=Fork)]` +
      `(https://github.com/${repos[i].repo})`;
    } else {
      // Insert a blank column when the number of repos is lower than 3
      string += `| ![empty](https://raw.githubusercontent.com/gothinkster/realworld/master/media/spacer-1669x257.gif)`;
    }
    if (!((i + 1) % 3)) {
      output.push(string);
      string = '';
    }
  }
  output.push(string);
  return output;

}

async function getWIPProjects(label) {
  const data = (await axios.get(`/repos/gothinkster/realworld/issues?state=open&per_page=100&labels=wip,${label}`)).data;
  console.log(`Number of ${label} WIP issues found: ${data.length}`);
  const wips = [];
  for (let i = data.length - 1; i >= 0; --i) {
    wips.push(`[${data[i].title}](${data[i].html_url})`);
  }
  return `**${wips.join(' | \n')}**`;
}

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at:', p, 'reason:', reason);
  throw new Error(reason);
});
