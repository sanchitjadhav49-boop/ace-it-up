with open('scripts/insert_error_tags_endpoints3.js', 'r') as f:
    lines = f.readlines()
    for i in range(59, 65):
        line = lines[i].rstrip('\n')
        print(f"Line {i+1}: {repr(line)}")
