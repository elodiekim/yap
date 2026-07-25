/**
 * Manual backup: `npm run backup`
 *
 * Sessions already snapshot themselves as they are saved, so this is for the
 * in-between moments — right after setting YAP_BACKUP for the first time, or
 * before touching the schema.
 */
import { snapshot } from "../src/lib/db.ts";

const target = snapshot();
if (target) {
  console.log(`백업 완료 → ${target}`);
} else {
  console.log(
    "YAP_BACKUP이 설정되지 않아 백업할 위치가 없습니다.\n" +
      ".env.local에 백업 경로를 넣어주세요. 예:\n" +
      '  YAP_BACKUP="/Users/사용자명/Library/Mobile Documents/com~apple~CloudDocs/yap-backup.db"',
  );
  process.exit(1);
}
