from abc import ABC, abstractmethod
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import time

class DiscoveredEntity(BaseModel):
    entity_type: str
    value: str
    raw_value: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    source: str
    confidence: str = "OBSERVED"

class DiscoveredRelationship(BaseModel):
    source_type: str
    source_value: str
    target_type: str
    target_value: str
    relation_type: str
    confidence: str = "OBSERVED"
    source: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

class CollectorResult(BaseModel):
    collector_name: str
    target: str
    success: bool
    entities: List[DiscoveredEntity] = Field(default_factory=list)
    relationships: List[DiscoveredRelationship] = Field(default_factory=list)
    raw_records: List[str] = Field(default_factory=list)
    error: Optional[str] = None
    execution_time_ms: float = 0.0

class BaseCollector(ABC):
    name: str = "base_collector"

    @abstractmethod
    async def collect(self, target: str) -> CollectorResult:
        """Execute OSINT collection for the given target."""
        pass
