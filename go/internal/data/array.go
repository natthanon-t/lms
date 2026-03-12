package data

import (
	"database/sql/driver"
	"fmt"
	"strings"
)

// StringArray is a database/sql compatible TEXT[] wrapper that works with
// pgx/v5/stdlib (and any other PostgreSQL driver) without requiring lib/pq.
type StringArray []string

func (a StringArray) Value() (driver.Value, error) {
	if a == nil {
		return "{}", nil
	}
	var b strings.Builder
	b.WriteByte('{')
	for i, s := range a {
		if i > 0 {
			b.WriteByte(',')
		}
		b.WriteByte('"')
		for _, c := range s {
			switch c {
			case '"':
				b.WriteString(`\"`)
			case '\\':
				b.WriteString(`\\`)
			default:
				b.WriteRune(c)
			}
		}
		b.WriteByte('"')
	}
	b.WriteByte('}')
	return b.String(), nil
}

func (a *StringArray) Scan(src interface{}) error {
	switch v := src.(type) {
	case string:
		*a = parsePostgresArray(v)
	case []byte:
		*a = parsePostgresArray(string(v))
	case nil:
		*a = StringArray{}
	default:
		return fmt.Errorf("StringArray.Scan: unsupported type %T", src)
	}
	return nil
}

// parsePostgresArray parses a PostgreSQL TEXT[] literal like {a,"b c",d}.
func parsePostgresArray(s string) StringArray {
	s = strings.TrimSpace(s)
	if s == "{}" || s == "" {
		return StringArray{}
	}
	if !strings.HasPrefix(s, "{") || !strings.HasSuffix(s, "}") {
		return StringArray{}
	}
	s = s[1 : len(s)-1]
	if s == "" {
		return StringArray{}
	}

	var result StringArray
	var cur strings.Builder
	inQuote := false
	escaped := false

	for _, c := range s {
		if escaped {
			cur.WriteRune(c)
			escaped = false
			continue
		}
		switch c {
		case '\\':
			escaped = true
		case '"':
			inQuote = !inQuote
		case ',':
			if inQuote {
				cur.WriteRune(c)
			} else {
				result = append(result, cur.String())
				cur.Reset()
			}
		default:
			cur.WriteRune(c)
		}
	}
	result = append(result, cur.String())
	return result
}
