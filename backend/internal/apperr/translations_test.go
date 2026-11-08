package apperr_test

import (
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

var codePattern = regexp.MustCompile(`\b(?:New|validation)\("([a-z_]+)",`)

func backendCodes(t *testing.T) []string {
	t.Helper()
	var codes []string
	err := filepath.WalkDir("..", func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return err
		}
		src, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		for _, m := range codePattern.FindAllStringSubmatch(string(src), -1) {
			codes = append(codes, m[1])
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	return codes
}

func TestEveryCodeHasAPortugueseTranslation(t *testing.T) {
	dict, err := os.ReadFile("../../../frontend/src/lib/i18n/pt.ts")
	if err != nil {
		t.Fatal(err)
	}

	codes := backendCodes(t)
	if len(codes) < 20 {
		t.Fatalf("found only %d codes", len(codes))
	}
	for _, code := range codes {
		if code == "internal" {
			continue
		}
		if !strings.Contains(string(dict), `"api.`+code+`"`) {
			t.Errorf("pt.ts has no translation for %q", code)
		}
	}
}
