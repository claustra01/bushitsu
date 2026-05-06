import { getEnabledSlotIds, UNANSWERED_LABEL, type PollConfig, type ResponseDto } from "../lib/schema";
import { countAnswers } from "../lib/summary";

type ResponseListProps = {
  slug: string;
  config: PollConfig;
  responses: ResponseDto[];
};

export default function ResponseList({ slug, config, responses }: ResponseListProps) {
  const slotIds = getEnabledSlotIds(config);

  if (responses.length === 0) {
    return <p className="muted">まだ回答はありません。</p>;
  }

  return (
    <>
      <div className="table-wrap response-list-desktop">
        <table className="response-table">
          <thead>
            <tr>
              <th scope="col">名前</th>
              <th scope="col">コメント</th>
              <th scope="col">回答数</th>
              <th scope="col">更新日時</th>
              <th scope="col">操作</th>
            </tr>
          </thead>
          <tbody>
            {responses.map((response) => {
              const counts = countAnswers(slotIds, response.answers);
              return (
                <tr key={response.id}>
                  <th scope="row">{response.name}</th>
                  <td>{response.comment ?? ""}</td>
                  <td>
                    <span className="compact-counts">
                      <span>{config.statusLabels.yes} {counts.yes}</span>
                      <span>{config.statusLabels.maybe} {counts.maybe}</span>
                      <span>{config.statusLabels.no} {counts.no}</span>
                      <span>{UNANSWERED_LABEL} {counts.unanswered}</span>
                    </span>
                  </td>
                  <td>{response.updatedAt ?? ""}</td>
                  <td>
                    <a className="table-action" href={`/p/${slug}/edit/${response.id}`}>
                      編集
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="response-card-list">
        {responses.map((response) => {
          const counts = countAnswers(slotIds, response.answers);
          return (
            <article className="response-card" key={response.id}>
              <div className="response-card-head">
                <h3>{response.name}</h3>
                <a className="table-action" href={`/p/${slug}/edit/${response.id}`}>
                  編集
                </a>
              </div>
              {response.comment && <p>{response.comment}</p>}
              <div className="compact-counts">
                <span>{config.statusLabels.yes} {counts.yes}</span>
                <span>{config.statusLabels.maybe} {counts.maybe}</span>
                <span>{config.statusLabels.no} {counts.no}</span>
                <span>{UNANSWERED_LABEL} {counts.unanswered}</span>
              </div>
              {response.updatedAt && <div className="response-card-date">{response.updatedAt}</div>}
            </article>
          );
        })}
      </div>
    </>
  );
}
