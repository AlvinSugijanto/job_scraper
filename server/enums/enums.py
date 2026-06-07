from enum import Enum
import re


class JobContractType(str, Enum):
    full_time = "full_time"
    part_time = "part_time"
    internship = "internship"
    contract = "contract"
    temporary = "temporary"

    @classmethod
    def detect(cls, text: str) -> "JobContractType":
        if not text:
            return cls.full_time

        text_lower = text.lower()

        if re.search(r"\bintern(ship)?\b", text_lower):
            return cls.internship

        if re.search(r"\bfull[\s-]?time\b", text_lower):
            return cls.full_time

        if re.search(r"\bpart[\s-]?time\b", text_lower):
            return cls.part_time

        if re.search(r"\bcontract\b", text_lower):
            return cls.contract

        if re.search(r"\btemporary\b", text_lower):
            return cls.temporary

        return cls.full_time


class JobType(str, Enum):
    remote = "remote"
    hybrid = "hybrid"
    onsite = "onsite"

    @classmethod
    def detect(cls, text: str) -> "JobType":
        if not text:
            return cls.onsite

        text_lower = text.lower()

        # Hybrid detection
        if re.search(r"\bhybrid\b", text_lower):
            return cls.hybrid
        # Remote detection
        if (
            re.search(r"\bremote\b", text_lower)
            or re.search(r"\bwork[\s-]?from[\s-]?home\b", text_lower)
            or re.search(r"\bwfh\b", text_lower)
        ):
            return cls.remote

        return cls.onsite
