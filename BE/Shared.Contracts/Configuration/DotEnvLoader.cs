namespace Shared.Contracts.Configuration
{
    public static class DotEnvLoader
    {
        public static void LoadFromStandardLocations(string currentDirectory, int maxParentLevels = 2)
        {
            var files = new List<string>();
            var directory = new DirectoryInfo(currentDirectory);

            for (var i = 0; i <= maxParentLevels && directory is not null; i++)
            {
                files.Add(Path.Combine(directory.FullName, ".env"));
                directory = directory.Parent;
            }

            Load(files);
        }

        public static void Load(IEnumerable<string> files)
        {
            foreach (var path in files.Distinct(StringComparer.OrdinalIgnoreCase))
            {
                if (!File.Exists(path))
                {
                    continue;
                }

                foreach (var rawLine in File.ReadLines(path))
                {
                    var line = rawLine.Trim();
                    if (line.Length == 0 || line.StartsWith('#'))
                    {
                        continue;
                    }

                    var separatorIndex = line.IndexOf('=');
                    if (separatorIndex <= 0)
                    {
                        continue;
                    }

                    var key = line[..separatorIndex].Trim();
                    var value = line[(separatorIndex + 1)..].Trim();

                    if (string.IsNullOrWhiteSpace(key))
                    {
                        continue;
                    }

                    if (value.Length >= 2
                        && ((value.StartsWith('"') && value.EndsWith('"'))
                            || (value.StartsWith('\'') && value.EndsWith('\''))))
                    {
                        value = value[1..^1];
                    }

                    if (Environment.GetEnvironmentVariable(key) is null)
                    {
                        Environment.SetEnvironmentVariable(key, value);
                    }
                }
            }
        }
    }
}
