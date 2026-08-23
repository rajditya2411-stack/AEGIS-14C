import time
import httpx
from typing import List
from app.collectors.base import BaseCollector, CollectorResult, DiscoveredEntity, DiscoveredRelationship

class PublicRepoCollector(BaseCollector):
    name: str = "Public Repository Collector"

    async def collect(self, target: str) -> CollectorResult:
        start_time = time.time()
        entities: List[DiscoveredEntity] = []
        relationships: List[DiscoveredRelationship] = []
        raw_records: List[str] = []

        clean_target = target.strip()
        # If full URL like https://github.com/owner/repo
        if "github.com/" in clean_target:
            parts = clean_target.split("github.com/")[-1].strip("/").split("/")
            org_or_user = parts[0]
            repo_name = parts[1] if len(parts) > 1 else None
        else:
            # e.g., "example" or "example.com" -> extract name
            org_or_user = clean_target.split(".")[0]
            repo_name = None

        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "TRACE-OSINT-PublicCollector/1.0"
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                # 1. Fetch public profile
                user_resp = await client.get(f"https://api.github.com/users/{org_or_user}", headers=headers)
                if user_resp.status_code == 200:
                    user_data = user_resp.json()
                    is_org = user_data.get("type") == "Organization"
                    name_val = user_data.get("name") or org_or_user
                    bio = user_data.get("bio")
                    blog = user_data.get("blog")

                    raw_records.append(f"GitHub: {org_or_user} ({user_data.get('type')}) - {name_val}")

                    ent_type = "ORGANIZATION" if is_org else "PERSON"
                    entities.append(DiscoveredEntity(
                        entity_type=ent_type,
                        value=name_val,
                        raw_value=org_or_user,
                        metadata={"github_type": user_data.get("type"), "bio": bio, "blog": blog},
                        source="GitHub",
                        confidence="OBSERVED"
                    ))

                    # 2. Fetch public repos
                    repos_resp = await client.get(f"https://api.github.com/users/{org_or_user}/repos?per_page=10&sort=updated", headers=headers)
                    if repos_resp.status_code == 200:
                        repos = repos_resp.json()
                        for repo in repos:
                            full_name = repo.get("full_name")  # e.g., "owner/repo"
                            repo_url = f"github.com/{full_name}"
                            description = repo.get("description")
                            stars = repo.get("stargazers_count")

                            entities.append(DiscoveredEntity(
                                entity_type="REPOSITORY",
                                value=repo_url,
                                raw_value=full_name,
                                metadata={"description": description, "stars": stars, "language": repo.get("language")},
                                source="GitHub",
                                confidence="OBSERVED"
                            ))

                            relationships.append(DiscoveredRelationship(
                                source_type=ent_type,
                                source_value=name_val,
                                target_type="REPOSITORY",
                                target_value=repo_url,
                                relation_type="owns",
                                confidence="OBSERVED",
                                source="GitHub",
                                metadata={"stars": stars}
                            ))

        except Exception as e:
            raw_records.append(f"GitHub collection error: {str(e)}")

        exec_time = (time.time() - start_time) * 1000.0
        return CollectorResult(
            collector_name=self.name,
            target=clean_target,
            success=len(entities) > 0,
            entities=entities,
            relationships=relationships,
            raw_records=raw_records,
            execution_time_ms=exec_time
        )
