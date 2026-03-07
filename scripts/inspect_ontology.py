#!/usr/bin/env python3
"""
检查本体项目数据脚本
用法: python scripts/inspect_ontology.py
"""
import json
import sys
import requests

BASE_URL = "http://localhost:9000"
PROJECT_ID = "proj_01ccfa6841df"


def login():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": "admin",
        "password": "admin123456"
    })
    resp.raise_for_status()
    data = resp.json()
    token = data["accessToken"]
    print(f"✅ 登录成功，token: {token[:20]}...")
    return token


def get(token, path, params=None):
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BASE_URL}{path}", headers=headers, params=params)
    if resp.status_code != 200:
        print(f"  ⚠️  {path} 返回 {resp.status_code}: {resp.text[:200]}")
        return None
    return resp.json()


def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)


def main():
    token = login()

    # 1. 项目基本信息
    section("项目基本信息")
    project = get(token, f"/api/projects/{PROJECT_ID}")
    if project:
        print(json.dumps(project, ensure_ascii=False, indent=2))

    # 2. Schema（实体类型 + 关系类型）
    section("Schema 配置")
    schema = get(token, f"/api/projects/{PROJECT_ID}/schema")
    if schema:
        print(json.dumps(schema, ensure_ascii=False, indent=2))

    # 3. 实体类型列表
    section("实体类型 (Entity Types)")
    entity_types = get(token, f"/api/projects/{PROJECT_ID}/entity-types")
    if entity_types:
        print(json.dumps(entity_types, ensure_ascii=False, indent=2))

    # 4. 关系类型列表
    section("关系类型 (Relation Types)")
    relation_types = get(token, f"/api/projects/{PROJECT_ID}/relation-types")
    if relation_types:
        print(json.dumps(relation_types, ensure_ascii=False, indent=2))

    # 5. 技能 (Skills)
    section("内置技能 (Skills)")
    skills = get(token, f"/api/projects/{PROJECT_ID}/skills")
    if skills:
        print(json.dumps(skills, ensure_ascii=False, indent=2))

    # 6. 动作 (Actions)
    section("动作 (Actions)")
    actions = get(token, f"/api/projects/{PROJECT_ID}/actions")
    if actions:
        print(json.dumps(actions, ensure_ascii=False, indent=2))

    # 7. 函数 (Functions)
    section("函数 (Functions)")
    functions = get(token, f"/api/projects/{PROJECT_ID}/functions")
    if functions:
        print(json.dumps(functions, ensure_ascii=False, indent=2))

    # 8. 知识图谱对象（前100条）
    section("知识图谱对象 (Objects, 前50条)")
    objects = get(token, f"/api/projects/{PROJECT_ID}/objects", params={"page": 1, "page_size": 50})
    if objects:
        print(json.dumps(objects, ensure_ascii=False, indent=2))

    # 9. 文档列表
    section("文档列表 (Documents)")
    docs = get(token, f"/api/projects/{PROJECT_ID}/documents")
    if docs:
        print(json.dumps(docs, ensure_ascii=False, indent=2))

    # 10. 版本信息
    section("本体版本 (Versions)")
    versions = get(token, f"/api/projects/{PROJECT_ID}/versions")
    if versions:
        print(json.dumps(versions, ensure_ascii=False, indent=2))

    print(f"\n{'='*60}")
    print("  数据检查完毕")
    print('='*60)


if __name__ == "__main__":
    main()
