import click.testing
import pytest


from my_package import cli


@pytest.fixture
def runner():
    return click.testing.CliRunner()


def test_main_succeeds(runner):
    result = runner.invoke(cli.cli)
    assert result.exit_code == 0
