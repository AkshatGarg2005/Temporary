import os
from typing import List, Tuple

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline


INTENTS = [
    "order_grocery",
    "book_housing",
    "housing_search",
    "book_cab",
    "home_service",
    "health_symptom",
    "doctor_consult",
    "smalltalk_or_other",
]


def build_training_data() -> pd.DataFrame:
    # Synthetic but richer dataset to better separate symptom vs service vs grocery.
    data: List[Tuple[str, str]] = [
        # order_grocery
        ("order me a biscuit", "order_grocery"),
        ("i want to buy biscuits", "order_grocery"),
        ("please order 1 litre milk", "order_grocery"),
        ("get me 2 packets of oreo biscuit", "order_grocery"),
        ("buy some bread and milk", "order_grocery"),
        ("add eggs and milk to my order", "order_grocery"),
        ("order groceries for me", "order_grocery"),
        ("reorder my usual biscuit", "order_grocery"),
        ("order me fanta", "order_grocery"),
        ("order fanta for me", "order_grocery"),
        ("fanta", "order_grocery"),
        ("order fanta cold drink", "order_grocery"),
        ("order some cold drink like fanta", "order_grocery"),

        # book_cab
        ("book me a cab from btm to indiranagar", "book_cab"),
        ("i need a taxi from airport to hotel", "book_cab"),
        ("can you book an uber from home to office", "book_cab"),
        ("cab from sehore bus stand to railway station", "book_cab"),
        ("i want a cab to the airport", "book_cab"),
        ("book me a cab from vit to bhopal", "book_cab"),

        # housing_search
        ("find me house in sehore", "housing_search"),
        ("find me stay in sehore", "housing_search"),
        ("i need a room for 2 days near hyderabad metro station", "housing_search"),
        ("show me rentals in bangalore", "housing_search"),
        ("looking for 1bhk for rent in indore", "housing_search"),
        ("search properties in mumbai for me", "housing_search"),

        # book_housing
        ("book that sehore house for a month", "book_housing"),
        ("confirm that flat for daily stay", "book_housing"),
        ("book this property for tomorrow", "book_housing"),
        ("i want to reserve this house for 3 days", "book_housing"),

        # home_service (plumber / electrician / etc.)
        ("my tap is leaking send a plumber", "home_service"),
        ("my tap is leaking", "home_service"),
        ("tap is leaking in my kitchen", "home_service"),
        ("water is leaking from tap please send plumber", "home_service"),
        ("fan not working", "home_service"),
        ("my fan is not working", "home_service"),
        ("ceiling fan not working", "home_service"),
        ("bulb not working", "home_service"),
        ("call an electrician my lights are flickering", "home_service"),
        ("light is not working send electrician", "home_service"),
        ("switch is sparking", "home_service"),
        ("i need a carpenter to fix my door", "home_service"),
        ("book a cleaning service for my house", "home_service"),
        ("send pest control tomorrow", "home_service"),

        # health_symptom
        ("my head is paining", "health_symptom"),
        ("my vision is blurry", "health_symptom"),
        ("i am feeling dizzy", "health_symptom"),
        ("i am unable to move my left arm", "health_symptom"),
        ("i have chest pain", "health_symptom"),
        ("i am coughing a lot", "health_symptom"),
        ("i have high fever since yesterday", "health_symptom"),
        ("i am feeling very weak with fever", "health_symptom"),

        # doctor_consult
        ("book a doctor appointment for me", "doctor_consult"),
        ("i want to consult a doctor", "doctor_consult"),
        ("schedule a doctor consultation for tomorrow", "doctor_consult"),
        ("connect me with a doctor now", "doctor_consult"),
        ("book a doctor for tomorrow 5 pm", "doctor_consult"),

        # smalltalk_or_other
        ("hi", "smalltalk_or_other"),
        ("hello", "smalltalk_or_other"),
        ("how are you", "smalltalk_or_other"),
        ("thank you", "smalltalk_or_other"),
        ("who are you", "smalltalk_or_other"),
        ("what can you do", "smalltalk_or_other"),
        ("good morning", "smalltalk_or_other"),
    ]
    texts, labels = zip(*data)
    df = pd.DataFrame({"text": list(texts), "intent": list(labels)})
    return df


def main():
    df = build_training_data()
    X = df["text"].values
    y = df["intent"].values

    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    vectorizer = TfidfVectorizer(
        lowercase=True,
        ngram_range=(1, 2),
        min_df=1,
    )
    classifier = MLPClassifier(
        hidden_layer_sizes=(64,),
        activation="relu",
        solver="adam",
        max_iter=80,
        random_state=42,
        verbose=False,
    )

    pipeline = Pipeline(
        [
            ("tfidf", vectorizer),
            ("mlp", classifier),
        ]
    )

    print("Training intent classifier...")
    pipeline.fit(X_train, y_train)

    # Evaluate
    y_pred = pipeline.predict(X_val)
    print("\nValidation classification report:")
    print(classification_report(y_val, y_pred, labels=INTENTS))

    cm = confusion_matrix(y_val, y_pred, labels=INTENTS)
    print("Confusion matrix:")
    print(cm)

    os.makedirs("models", exist_ok=True)

    # Confusion matrix plot
    fig_cm, ax_cm = plt.subplots(figsize=(8, 6))
    im = ax_cm.imshow(cm, interpolation="nearest", cmap="Blues")
    ax_cm.figure.colorbar(im, ax=ax_cm)
    ax_cm.set(
        xticks=np.arange(len(INTENTS)),
        yticks=np.arange(len(INTENTS)),
        xticklabels=INTENTS,
        yticklabels=INTENTS,
        ylabel="True label",
        xlabel="Predicted label",
        title="Intent Confusion Matrix",
    )
    plt.setp(ax_cm.get_xticklabels(), rotation=45, ha="right", rotation_mode="anchor")
    fig_cm.tight_layout()
    fig_cm.savefig(os.path.join("models", "confusion_matrix.png"))
    plt.close(fig_cm)

    # Loss curve
    mlp = pipeline.named_steps["mlp"]
    if hasattr(mlp, "loss_curve_"):
        fig_loss, ax_loss = plt.subplots()
        ax_loss.plot(mlp.loss_curve_, marker="o")
        ax_loss.set_xlabel("Iteration")
        ax_loss.set_ylabel("Loss")
        ax_loss.set_title("MLP Training Loss Curve")
        fig_loss.tight_layout()
        fig_loss.savefig(os.path.join("models", "loss_curve.png"))
        plt.close(fig_loss)

    model_path = os.path.join("models", "intent_model.joblib")
    joblib.dump(pipeline, model_path)
    print(f"Saved trained model to {model_path}")


if __name__ == "__main__":
    main()
