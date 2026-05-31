with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix remaining corrupted arrow and dash characters
fixes = [
    ('â†‘', '↑'),  # up arrow
    ('â†“', '↓'),  # down arrow
    ('â€“', '–'),  # en dash
    ('â†µ', '↵'),  # return arrow
]

for bad, good in fixes:
    content = content.replace(bad, good)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed remaining characters')