import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

/**
 * Chạy tuần tự (workers = 1) vì nhiều case dùng chung dữ liệu mẫu (Conflor 100, Rifamox 800...)
 * trên staging; chạy song song dễ làm case này phá dữ liệu của case kia.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: Number(process.env.WORKERS || 1),
  retries: Number(process.env.RETRIES || 0),
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'reports/html' }],
    ['json', { outputFile: 'reports/results.json' }],
  ],
  use: {
    baseURL: process.env.BASE_URL,
    ignoreHTTPSErrors: true,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    viewport: { width: 1366, height: 768 },
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    httpCredentials: process.env.BASIC_AUTH_USER
      ? { username: process.env.BASIC_AUTH_USER, password: process.env.BASIC_AUTH_PASS || '' }
      : undefined,
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    // Tạo dữ liệu mẫu: npm run seed (chạy 1 lần, chạy lại không tạo trùng)
    { name: 'seed', dependencies: ['setup'], testMatch: /\.seed\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
    {
      name: 'chrome',
      dependencies: ['setup'],
      testIgnore: [/auth\.setup\.ts/, /\.seed\.ts/],
      use: {
        ...devices['Desktop Chrome'],
        channel: process.env.PW_CHANNEL || undefined, // đặt PW_CHANNEL=chrome để chạy bằng Chrome cài trên máy
        viewport: { width: 1366, height: 768 },
      },
    },
  ],
});
