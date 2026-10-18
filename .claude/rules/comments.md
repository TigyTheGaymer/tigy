# Comments

Keep comments few and short. Write one only when the code can't say it itself:

- why something is done this way, especially when the obvious way would break (`// A backend, not an interceptor: ...`);
- a non-obvious constraint or edge case (`// Firestore IDs never contain a slash.`);
- a short example of an output format (`/** "820 B", "340 KB", "1.2 MB". */`).

Don't write:

- comments that restate a name, a signature or the next line (`/** The home header. */` on `home()`);
- headers that list the spec requirements or design decisions a file covers;
- references to design decisions (`design P5`) in place of the reason itself.

One line is the default. Use more only for a reason that needs it.
