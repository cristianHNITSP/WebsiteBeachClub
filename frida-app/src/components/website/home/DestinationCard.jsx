import { RightOutlined } from "@ant-design/icons";

function DestinationCard({ d, onClick }) {
  return (
    <button
      className="hf-destCard"
      style={{ backgroundImage: `url('${d.img}')` }}
      onClick={onClick}
      type="button"
    >
      <div className="hf-destShade" />
      <div className="hf-destBottom">
        <div>
          <div className="hf-destName">{d.name}</div>
          <div className="hf-destSub">{d.subtitle}</div>
        </div>
        <div className="hf-destArrow">
          <RightOutlined />
        </div>
      </div>
    </button>
  );
}

export default DestinationCard;
