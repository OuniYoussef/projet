import "../pages/About.css";
import objectifsImg from "../assets/objectifs.jpg";
import visionImg from "../assets/vision.jpg";
import equipeImg from "../assets/equipe.jpg";

export default function About() {
  return (
    <div className="about-page">
      <section className="cards-section">
        <div className="cards-container">
          <div className="about-card">
            <div className="card-image">
              <img src={objectifsImg} alt="Notre Mission & Objectifs" />
            </div>
            <div className="card-content">
              <h3>Notre Mission & Objectifs</h3>
              <p>
                Chez HubShop, nous croyons que le shopping en ligne doit être simple, rapide et agréable.
              </p>
              <p>
                Notre plateforme vous offre une expérience fluide pour découvrir, comparer et acheter vos produits préférés — le tout depuis le confort de votre maison.
              </p>
            </div>
          </div>

          <div className="about-card">
            <div className="card-image">
              <img src={visionImg} alt="Notre Vision" />
            </div>
            <div className="card-content">
              <h3>Notre Vision</h3>
              <p>
                Nous voulons faire de HubShop une référence du e-commerce local et éthique.
              </p>
              <p>
                Nous croyons en un commerce responsable, innovant et humain où chaque interaction compte.
              </p>
            </div>
          </div>

          <div className="about-card">
            <div className="card-image">
              <img src={equipeImg} alt="Notre Équipe" />
            </div>
            <div className="card-content">
              <h3>Notre Équipe</h3>
              <p>
                HubShop a été conçu par une équipe passionnée de développeurs, designers et étudiants en ingénierie logicielle.
              </p>
              <p>
                Notre équipe combine créativité, expertise technique et sens du détail pour une meilleure expérience.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="quote-section">
        <div className="quote-container">
          <blockquote className="quote-text">
            Chez HubShop, chaque clic compte. Nous travaillons chaque jour pour que votre expérience soit plus agréable, plus locale et plus humaine. Merci de faire partie de notre aventure!
          </blockquote>
        </div>
      </section>
    </div>
  );
}
