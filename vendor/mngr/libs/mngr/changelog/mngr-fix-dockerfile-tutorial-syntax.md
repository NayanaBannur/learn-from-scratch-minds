Corrected the custom-Dockerfile tutorial, which documented a command that cannot work.

It taught `mngr create my-task --provider docker -b file=./Dockerfile.dev -b .`. The docker provider passes `-b` values to `docker build` verbatim, so that produced `docker build -t <tag> file=./Dockerfile.dev .` -- two positional arguments, which docker rejects with `'docker build' requires 1 argument`. The Dockerfile is selected with docker's own flag, `-b --file=./Dockerfile.dev`.
