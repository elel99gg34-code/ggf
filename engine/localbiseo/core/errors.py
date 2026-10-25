from __future__ import annotations


class AppError(Exception):
    """사용자에게 그대로 보여줄 수 있는 오류. message는 한국어로 쓴다."""

    status = 400

    def __init__(self, message: str, **extra):
        super().__init__(message)
        self.message = message
        self.extra = extra

    def to_dict(self) -> dict:
        return {"error": self.message, **self.extra}


class NotFound(AppError):
    status = 404


class FeatureUnavailable(AppError):
    """선택 구성요소(모델, 라이브러리)가 설치되지 않아 쓸 수 없는 기능."""

    status = 424


class LicenseRequired(AppError):
    status = 402


class Cancelled(Exception):
    pass
