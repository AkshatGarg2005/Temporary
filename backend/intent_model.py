from pathlib import Path
from typing import Any, Optional

import joblib
from sklearn.pipeline import Pipeline


class IntentModel:
    """
    Wraps a scikit-learn Pipeline for intent classification.
    The pipeline is expected to output a single intent label string.
    """

    def __init__(self, pipeline: Pipeline):
        self.pipeline = pipeline

    @classmethod
    def load(cls, model_path: str) -> "IntentModel":
        path = Path(model_path)
        if not path.exists():
            raise FileNotFoundError(f"Intent model not found at {model_path}")
        pipeline = joblib.load(path)
        if not isinstance(pipeline, Pipeline):
            raise ValueError("Loaded object is not a scikit-learn Pipeline")
        return cls(pipeline)

    def predict_intent(self, text: str) -> str:
        preds = self.pipeline.predict([text])
        return str(preds[0])

    def predict_proba(self, text: str) -> Optional[Any]:
        clf = self.pipeline.named_steps.get("mlp")
        if clf is None or not hasattr(clf, "predict_proba"):
            return None
        proba = clf.predict_proba(
            self.pipeline.named_steps["tfidf"].transform([text])
        )
        return proba[0]

    @property
    def classes(self):
        return list(self.pipeline.classes_)
