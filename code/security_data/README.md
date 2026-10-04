# security_data

`common_passwords.txt`: the 10,000 most common passwords, from
[SecLists](https://github.com/danielmiessler/SecLists) (`Passwords/Common-Credentials/10k-most-common.txt`),
MIT License, Copyright (c) 2018 Daniel Miessler.

The signup, password-change and password-reset endpoints reject any password found in this list
(also after lowercasing and stripping digits/symbols from the ends, so `Password123!` is rejected too).
