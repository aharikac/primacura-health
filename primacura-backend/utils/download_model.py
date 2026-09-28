from sentence_transformers import SentenceTransformer

# Downloads the model and saves all necessary files to a local folder
model = SentenceTransformer("pritamdeka/S-PubMedBert-MS-MARCO")
model.save("./models/S-PubMedBert-MS-MARCO")
print("Model saved locally!")