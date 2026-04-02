# Upstream repository notes

This playbook's `/src/` code is adapted from [jeokrohn/ucmmigration](https://github.com/jeokrohn/ucmmigration) (Python 3.8).

## Original project description

The upstream README states the project is a playground to analyze UCM configuration data from TAR files containing a UCM config export. Code is provided as-is.

## Installing dependencies (upstream)

1. Install Python from [python.org](https://www.python.org).
2. Create and activate a virtual environment ([venv tutorial](https://docs.python.org/3/tutorial/venv.html)).
3. Run `pip install -r requirements.txt` from the directory containing `requirements.txt`.

## Running the main application (upstream)

- Place one or more UCM bulk-export `.tar` files in the working directory.
- Run `python main.py`. The tool discovers all `*.tar` files in the current directory and starts the interactive `App` menu.

## Running the simple example (upstream)

- Ensure `sample.tar` (or edit the filename in `simple.py`) exists in the working directory.
- Run `python simple.py`.

## Additional utilities (upstream)

- `transform_tar.py` — Strip selected columns from `phone.csv` and `enduser.csv` inside a TAR; writes `*_transformed.tar`.
- `type_user_association.py` — Scans `enduser.csv` in each local `*.tar` for distinct `TYPE USER ASSOCIATION` values (see `env.template` for `main()` mode).
- `reduce_tar.py` — Reduce TAR size for testing.

## Pipenv (upstream)

The upstream repo includes `Pipfile` and `Pipfile.lock` for users who prefer Pipenv. This playbook standardizes on `requirements.txt` only.

## License

The upstream repository does not include a `LICENSE` file. Verify licensing with the upstream maintainer before redistribution.
