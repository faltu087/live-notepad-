export interface Language {
  id: string;
  name: string;
  extension: string;
}

export const LANGUAGES: Language[] = [
  { id: "plaintext", name: "Plain Text", extension: ".txt" },
  { id: "javascript", name: "JavaScript", extension: ".js" },
  { id: "typescript", name: "TypeScript", extension: ".ts" },
  { id: "python", name: "Python", extension: ".py" },
  { id: "java", name: "Java", extension: ".java" },
  { id: "c", name: "C", extension: ".c" },
  { id: "cpp", name: "C++", extension: ".cpp" },
  { id: "csharp", name: "C#", extension: ".cs" },
  { id: "go", name: "Go", extension: ".go" },
  { id: "rust", name: "Rust", extension: ".rs" },
  { id: "ruby", name: "Ruby", extension: ".rb" },
  { id: "php", name: "PHP", extension: ".php" },
  { id: "swift", name: "Swift", extension: ".swift" },
  { id: "kotlin", name: "Kotlin", extension: ".kt" },
  { id: "dart", name: "Dart", extension: ".dart" },
  { id: "html", name: "HTML", extension: ".html" },
  { id: "css", name: "CSS", extension: ".css" },
  { id: "scss", name: "SCSS", extension: ".scss" },
  { id: "json", name: "JSON", extension: ".json" },
  { id: "xml", name: "XML", extension: ".xml" },
  { id: "yaml", name: "YAML", extension: ".yaml" },
  { id: "markdown", name: "Markdown", extension: ".md" },
  { id: "sql", name: "SQL", extension: ".sql" },
  { id: "shell", name: "Shell", extension: ".sh" },
  { id: "powershell", name: "PowerShell", extension: ".ps1" },
  { id: "dockerfile", name: "Dockerfile", extension: "" },
  { id: "lua", name: "Lua", extension: ".lua" },
  { id: "r", name: "R", extension: ".r" },
  { id: "scala", name: "Scala", extension: ".scala" },
  { id: "perl", name: "Perl", extension: ".pl" },
  { id: "haskell", name: "Haskell", extension: ".hs" },
  { id: "elixir", name: "Elixir", extension: ".ex" },
];

export const DEFAULT_LANGUAGE = LANGUAGES[0]; // Plain Text

export function getLanguageById(id: string): Language {
  return LANGUAGES.find((l) => l.id === id) || DEFAULT_LANGUAGE;
}
