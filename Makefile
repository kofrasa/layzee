
# configuration
MODULE = layzee
VERSION = $(shell cat VERSION)
YEAR = $(shell date +%Y)
BANNER = templates/header.txt
TEST_FILES = $(shell find test -name "*.js")

# tools
CODECOV = node_modules/.bin/codecov
NYC = node_modules/.bin/nyc
ROLLUP = node_modules/.bin/rollup
TAPE = node_modules/.bin/tape
UGLIFY = node_modules/.bin/uglifyjs

# tasks
all: clean test build


build: prepare layzee.js package.json compress
	@echo "\033[0;32mBUILD SUCCEEDED"

prepare:
	@sed -E -i .bak "s/VERSION = '.{1,}'/VERSION = '${VERSION}'/" index.js && rm index.js.bak

compress: layzee.js
	@cat ${BANNER} | sed "s/@VERSION/${VERSION}/" | sed "s/@YEAR/${YEAR}/" > dist/${MODULE}.min.js
	@${UGLIFY} dist/${MODULE}.js --compress --mangle >> dist/${MODULE}.min.js

clean:
	@rm -fr dist/*
	@rm -f package.json

coverage:
	${NYC} report --reporter=text-lcov > coverage.lcov && ${CODECOV}

layzee.js:
	@${ROLLUP} -c config/rollup.js

test: layzee.js
	@${NYC} --reporter=lcov --reporter=text ${TAPE} ${TEST_FILES}

%.json: templates/%.json.txt
	@cat $< | sed "s/@VERSION/${VERSION}/" > $@


.PHONY: clean test build coverage
