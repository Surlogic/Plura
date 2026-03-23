#!/usr/bin/env bash
set -euo pipefail

FILE="backend-java/src/main/java/com/plura/plurabackend/core/home/HomeService.java"

if [ ! -f "$FILE" ]; then
  echo "No encuentro $FILE. Corre este script desde el root del repo."
  exit 1
fi

cp "$FILE" "$FILE.bak_home_cache_fix"

python3 - <<'PY'
from pathlib import Path

path = Path("backend-java/src/main/java/com/plura/plurabackend/core/home/HomeService.java")
text = path.read_text()

imports_to_remove = [
    'import org.slf4j.Logger;\n',
    'import org.slf4j.LoggerFactory;\n',
    'import org.springframework.boot.context.event.ApplicationReadyEvent;\n',
    'import org.springframework.cache.annotation.Cacheable;\n',
    'import org.springframework.context.event.EventListener;\n',
    'import org.springframework.scheduling.annotation.Async;\n',
]
for s in imports_to_remove:
    text = text.replace(s, '')

text = text.replace(
    '    private static final Logger LOGGER = LoggerFactory.getLogger(HomeService.class);\n',
    ''
)

warmup_block = '''    @Async
    @EventListener(ApplicationReadyEvent.class)
    public void warmUpCache() {
        try {
            getHomeData();
            LOGGER.info("Home data cache warmed up successfully");
        } catch (Exception exception) {
            LOGGER.warn("Home data cache warm-up failed", exception);
        }
    }

'''
text = text.replace(warmup_block, '')

text = text.replace(
    '    @Cacheable("homeData")\n    @Transactional(readOnly = true)\n    public HomeResponse getHomeData() {\n',
    '    @Transactional(readOnly = true)\n    public HomeResponse getHomeData() {\n'
)

path.write_text(text)
PY

echo "Patch aplicado en $FILE"
echo "Backup creado en $FILE.bak_home_cache_fix"
echo
echo "Ahora valida con:"
echo "cd backend-java && ./gradlew compileJava"
echo "o desde root:"
echo "./backend-java/gradlew -p backend-java compileJava"
