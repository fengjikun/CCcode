import json
import os
from collections import OrderedDict
from typing import Dict, List, Any, Optional

# In-memory storage
_nodes: Dict[str, Dict[str, Any]] = OrderedDict()
_relations: List[Dict[str, Any]] = []


def load(data_path: str = None):
    """Load the fault knowledge graph from graph.jsonl."""
    global _nodes, _relations
    _nodes.clear()
    _relations.clear()

    if data_path is None:
        data_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "fault-ontology", "graph.jsonl")
    data_path = os.path.abspath(data_path)

    with open(data_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            record = json.loads(line)
            rec_type = record.get("type")
            if rec_type == "node":
                _nodes[record["id"]] = record
            elif rec_type == "relation":
                _relations.append({
                    "from": record["from"],
                    "to": record["to"],
                    "relation": record["relation"],
                    "properties": record.get("properties", {}),
                })


# ===== Query APIs =====

def all_phenomena() -> List[Dict[str, Any]]:
    return _nodes_by_entity("Phenomenon")


def all_sub_phenomena() -> List[Dict[str, Any]]:
    return _nodes_by_entity("SubPhenomenon")


def get_sub_phenomena(phen_id: str) -> List[Dict[str, Any]]:
    return _related_nodes(phen_id, "contains", "SubPhenomenon")


def get_checkpoints(node_id: str) -> List[Dict[str, Any]]:
    results = []
    for r in _relations:
        if r["from"] == node_id and r["relation"] == "needs_check":
            cp = _nodes.get(r["to"])
            if cp is None:
                continue
            result = dict(cp)
            rel_props = r.get("properties", {})
            result["priority"] = rel_props.get("priority", 99)
            results.append(result)
    results.sort(key=lambda x: x.get("priority", 99) if isinstance(x.get("priority", 99), (int, float)) else 99)
    return results


def get_causes_and_solutions(sub_phen_id: str) -> Dict[str, Any]:
    causes = _related_nodes(sub_phen_id, "caused_by", "Cause")
    solutions = _related_nodes(sub_phen_id, "solved_by", "Solution")

    # Supplement solutions from causes
    for cause in causes:
        cause_id = cause.get("id")
        cause_sols = _related_nodes(cause_id, "solved_by", "Solution")
        for sol in cause_sols:
            sol_id = sol.get("id")
            if not any(s.get("id") == sol_id for s in solutions):
                solutions.append(sol)

    return {"causes": causes, "solutions": solutions}


def get_parameter_config(checkpoint_id: str) -> List[Dict[str, Any]]:
    results = []
    for r in _relations:
        if r["to"] == checkpoint_id and r["relation"] == "supports":
            node = _nodes.get(r["from"])
            if node:
                results.append(node)
    return results


def search_phenomena(query: str) -> List[Dict[str, Any]]:
    if not query or not query.strip():
        return all_phenomena()
    q = query.strip().lower()
    results = []
    for node in _nodes.values():
        entity = node.get("entity")
        if entity not in ("Phenomenon", "SubPhenomenon"):
            continue
        label = str(node.get("label", "")).lower()
        props = node.get("properties", {})
        desc = str(props.get("description", "")).lower() if props else ""
        if q in label or q in desc:
            results.append(node)
    return results


def list_equipment_faults(equipment_label: str) -> List[Dict[str, Any]]:
    results = []
    for node in _nodes.values():
        if node.get("entity") != "Equipment":
            continue
        label = str(node.get("label", "")).lower()
        if equipment_label.lower() not in label:
            continue
        equip_id = node.get("id")
        for r in _relations:
            if r["from"] == equip_id and r["relation"] == "prone_to":
                target = _nodes.get(r["to"])
                if target:
                    results.append(target)
    return results


def get_phenomenon_detail(phen_id: str) -> Dict[str, Any]:
    phen = _nodes.get(phen_id)
    if phen is None:
        return {"error": f"现象不存在: {phen_id}"}
    return {
        "phenomenon": phen,
        "checkpoints": get_checkpoints(phen_id),
        "subPhenomena": _build_sub_phen_tree(phen_id),
    }


def search_by_symptoms(symptoms: Optional[List[str]], device_type: Optional[str]) -> List[Dict[str, Any]]:
    found_ids = []

    if device_type and device_type.strip():
        found_ids.extend(_list_equipment_fault_ids(device_type))

    if symptoms:
        for sym in symptoms:
            for n in search_phenomena(sym):
                nid = n.get("id")
                if nid not in found_ids:
                    found_ids.append(nid)

    if not found_ids:
        return all_phenomena()
    return [_nodes[nid] for nid in found_ids if nid in _nodes]


def graph_data() -> Dict[str, Any]:
    node_list = []
    for node in _nodes.values():
        node_list.append({
            "id": node.get("id"),
            "type": node.get("entity"),
            "label": node.get("label"),
            "props": node.get("properties", {}),
        })

    link_list = []
    for rel in _relations:
        link_list.append({
            "source": rel["from"],
            "target": rel["to"],
            "rel": rel["relation"],
        })

    return {"nodes": node_list, "links": link_list}


# ===== Internal helpers =====

def _nodes_by_entity(entity: str) -> List[Dict[str, Any]]:
    return [n for n in _nodes.values() if n.get("entity") == entity]


def _related_nodes(from_id: str, rel_type: str, entity_filter: str = None) -> List[Dict[str, Any]]:
    results = []
    for r in _relations:
        if r["from"] == from_id and r["relation"] == rel_type:
            node = _nodes.get(r["to"])
            if node is None:
                continue
            if entity_filter and node.get("entity") != entity_filter:
                continue
            results.append(node)
    return results


def _build_sub_phen_tree(node_id: str) -> List[Dict[str, Any]]:
    sub_phens = get_sub_phenomena(node_id)
    result = []
    for sp in sub_phens:
        sp_id = sp.get("id")
        sp_detail = dict(sp)
        sp_detail["checkpoints"] = get_checkpoints(sp_id)
        sp_detail["causesAndSolutions"] = get_causes_and_solutions(sp_id)
        children = _build_sub_phen_tree(sp_id)
        sp_detail["children"] = children

        # If no direct causes, aggregate from children
        cs = sp_detail.get("causesAndSolutions", {})
        if isinstance(cs, dict) and not cs.get("causes"):
            agg_causes = []
            agg_sols = []
            _collect_from_children(children, agg_causes, agg_sols)
            if agg_causes:
                sp_detail["causesAndSolutions"] = {"causes": agg_causes, "solutions": agg_sols}

        result.append(sp_detail)
    return result


def _collect_from_children(children: List[Dict[str, Any]], causes: List[str], sols: List[Dict[str, Any]]):
    for child in children:
        cs = child.get("causesAndSolutions")
        if isinstance(cs, dict):
            cause_list = cs.get("causes", [])
            if isinstance(cause_list, list):
                for c in cause_list:
                    if isinstance(c, dict):
                        label = str(c.get("label", ""))
                        if label and label not in causes:
                            causes.append(label)
            sol_list = cs.get("solutions", [])
            if isinstance(sol_list, list):
                for s in sol_list:
                    if isinstance(s, dict):
                        sid = s.get("id")
                        if not any(x.get("id") == sid for x in sols):
                            sols.append(s)
        grandchildren = child.get("children", [])
        _collect_from_children(grandchildren, causes, sols)


def _list_equipment_fault_ids(device_type: str) -> List[str]:
    dt = device_type.lower()
    result = []
    for node in _nodes.values():
        if node.get("entity") != "Equipment":
            continue
        label = str(node.get("label", "")).lower()
        props = node.get("properties", {})
        desc = str(props.get("description", "")).lower() if props else ""
        if dt not in label and dt not in desc:
            continue
        equip_id = node.get("id")
        for r in _relations:
            if r["from"] == equip_id and r["relation"] == "prone_to":
                result.append(r["to"])
    return result
