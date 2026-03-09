from pathlib import Path


def test_docker_defaults_to_mock_mode() -> None:
    compose_text = Path("docker-compose.yml").read_text(encoding="utf-8")
    env_example_text = Path("deploy/.env.example").read_text(encoding="utf-8")

    assert "APP_MODE: ${APP_MODE:-mock}" in compose_text
    assert "APP_MODE=mock" in env_example_text
