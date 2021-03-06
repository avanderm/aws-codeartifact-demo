import nox


nox.options.sessions = "lint", "tests"
locations = "src", "tests", "noxfile.py"


@nox.session(python=["3.7", "3.8"])
def tests(session):
    session.run("poetry", "install", external=True)
    session.run("pytest", "--cov")


@nox.session(python="3.8")
def lint(session):
    args = session.posargs or locations
    session.install("flake8", "flake8-black")
    session.run("flake8", *args)


@nox.session(python="3.8")
def black(session):
    args = session.posargs or locations
    session.install("black")
    session.run("black", *args)
