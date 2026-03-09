from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient


def _new_ontology_store(path: Path):
    from app.services.mock_json_store import JsonStore

    return JsonStore(
        path,
        lambda: {
            "objectTypes": [],
            "properties": {},
            "linkTypes": [],
            "actionTypes": [],
            "actionParameters": {},
            "actionRules": {},
            "functions": [],
            "objects": [],
            "links": [],
            "idSeq": 1000,
        },
    )


def _new_overview_store(path: Path):
    from app.services.mock_json_store import JsonStore

    return JsonStore(path, lambda: {"objectTypes": [], "linkTypes": [], "actions": []})


def _build_client(tmp_path: Path) -> tuple[TestClient, dict]:
    from app.services import mock_json_store as store_mod
    from app.routers import mock_ontology as router_mod

    original = {
        "store_ontology": store_mod.ontology_store,
        "store_overview": store_mod.ontology_overview_store,
        "next_onto_id": store_mod.next_onto_id,
        "router_ontology": router_mod.ontology_store,
        "router_overview": router_mod.ontology_overview_store,
        "router_next_onto_id": router_mod.next_onto_id,
    }

    ontology_store = _new_ontology_store(tmp_path / "ontology_store.json")
    overview_store = _new_overview_store(tmp_path / "ontology_overview.json")

    def _next_onto_id() -> int:
        return ontology_store.next_id(start=1000)

    store_mod.ontology_store = ontology_store
    store_mod.ontology_overview_store = overview_store
    store_mod.next_onto_id = _next_onto_id
    router_mod.ontology_store = ontology_store
    router_mod.ontology_overview_store = overview_store
    router_mod.next_onto_id = _next_onto_id

    app = FastAPI()
    app.include_router(router_mod.router)
    return TestClient(app), original


def _restore(original: dict) -> None:
    from app.services import mock_json_store as store_mod
    from app.routers import mock_ontology as router_mod

    store_mod.ontology_store = original["store_ontology"]
    store_mod.ontology_overview_store = original["store_overview"]
    store_mod.next_onto_id = original["next_onto_id"]
    router_mod.ontology_store = original["router_ontology"]
    router_mod.ontology_overview_store = original["router_overview"]
    router_mod.next_onto_id = original["router_next_onto_id"]


def test_mock_ontology_schema_crud(tmp_path: Path):
    client, original = _build_client(tmp_path)
    try:
        create_ot_res = client.post(
            "/api/ontology/object-types",
            json={"name": "Equipment", "displayName": "设备", "description": "设备实体"},
        )
        assert create_ot_res.status_code == 200
        object_type = create_ot_res.json()
        assert object_type["id"] > 1000
        assert object_type["name"] == "Equipment"

        create_prop_res = client.post(
            f"/api/ontology/object-types/{object_type['id']}/properties",
            json={"name": "model", "displayName": "型号", "dataType": "STRING", "required": True},
        )
        assert create_prop_res.status_code == 200
        property_item = create_prop_res.json()
        assert property_item["id"] > object_type["id"]
        assert property_item["required"] is True

        create_link_res = client.post(
            "/api/ontology/link-types",
            json={
                "name": "belongs_to",
                "displayName": "属于",
                "sourceObjectTypeId": object_type["id"],
                "targetObjectTypeId": object_type["id"],
                "cardinality": "MANY_TO_ONE",
            },
        )
        assert create_link_res.status_code == 200

        list_schema_res = client.get("/api/ontology/schema")
        assert list_schema_res.status_code == 200
        schema = list_schema_res.json()
        assert len(schema["objectTypes"]) == 1
        assert len(schema["properties"][str(object_type["id"])]) == 1
        assert len(schema["linkTypes"]) == 1

        clear_res = client.delete("/api/ontology/schema")
        assert clear_res.status_code == 204

        list_after_clear_res = client.get("/api/ontology/schema")
        assert list_after_clear_res.status_code == 200
        schema_after_clear = list_after_clear_res.json()
        assert schema_after_clear["objectTypes"] == []
        assert schema_after_clear["properties"] == {}
        assert schema_after_clear["linkTypes"] == []
    finally:
        _restore(original)


def test_mock_ontology_overview_stats_supports_numeric_property_counts(tmp_path: Path):
    client, original = _build_client(tmp_path)
    try:
        from app.services import mock_json_store as store_mod
        from app.routers import mock_ontology as router_mod

        overview_payload = {
            "objectTypes": [
                {"key": "1", "name": "Equipment", "properties": 3, "recordCount": 12},
                {"key": "2", "name": "Phenomenon", "properties": 2, "recordCount": 8},
            ],
            "linkTypes": [{"key": "1", "name": "prone_to"}],
            "actions": [
                {"key": "1", "name": "AutoDiagnose", "status": "Active"},
                {"key": "2", "name": "CheckSpareParts", "status": "Draft"},
            ],
        }
        store_mod.ontology_overview_store.data = overview_payload
        store_mod.ontology_overview_store.save()
        router_mod.ontology_overview_store.data = overview_payload

        res = client.get("/api/ontology/overview/stats")
        assert res.status_code == 200
        assert res.json() == {
            "objectTypesCount": 2,
            "totalProperties": 5,
            "linkTypesCount": 1,
            "actionsCount": 2,
            "totalRecords": "0.0K",
            "activeActions": 1,
        }
    finally:
        _restore(original)
