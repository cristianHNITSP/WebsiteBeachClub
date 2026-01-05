import { Button, Tooltip } from "antd";
import {
  HeartFilled,
  HeartOutlined,
  StarFilled,
} from "@ant-design/icons";
import { beachColors } from "../../../theme/beachTheme";

function FeaturedCard({ item, onReserve, isFav, onToggleFav }) {
  const badgeBg =
    item.badge?.color === "coral"
      ? beachColors.coral
      : item.badge?.color === "teal"
      ? beachColors.teal
      : beachColors.sunset;

  return (
    <div className="hf-featCard">
      <div className="hf-featInner">
        <div
          className="hf-featThumb"
          style={{ backgroundImage: `url('${item.img}')` }}
        />
        <div className="hf-featInfo">
          <div className="hf-featTopLine">
            <div className="hf-featTitle">{item.title}</div>
            <div className="hf-featBadge" style={{ background: badgeBg }}>
              {item.badge?.text}
            </div>
          </div>

          <div className="hf-featSub">
            <span className="hf-featPlace">{item.place}</span>
            <span className="hf-dot">•</span>
            <span className="hf-featRating">
              <StarFilled style={{ color: beachColors.sunset }} />
              <span className="hf-featRatingNum">{item.rating}</span>
            </span>
            <span className="hf-featPrice">${item.price}/noche</span>
          </div>
        </div>
      </div>

      <div className="hf-featActions">
        <Tooltip title={isFav ? "Quitar de favoritos" : "Guardar en favoritos"}>
          <Button
            className="hf-featGhost"
            icon={isFav ? <HeartFilled /> : <HeartOutlined />}
            onClick={() => onToggleFav(item.key)}
          />
        </Tooltip>

        <Button
          className="hf-featBtn"
          type="primary"
          onClick={() => onReserve(item)}
        >
          Ver y reservar
        </Button>
      </div>
    </div>
  );
}

export default FeaturedCard;
