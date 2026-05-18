import styles from './familiar-schema-diagram.module.css';

type Field = {
  name: string;
  type: string;
};

type Entity = {
  id: string;
  title: string;
  accent: string;
  fields: Field[];
};

const entities: Entity[] = [
  {
    id: 'harness',
    title: 'HARNESS',
    accent: 'Provider adapter',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'kind', type: 'string' },
      { name: 'status', type: 'string' },
      { name: 'config', type: 'object' },
    ],
  },
  {
    id: 'familiar',
    title: 'FAMILIAR',
    accent: 'Agent profile',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'harness_id', type: 'string' },
      { name: 'model', type: 'string' },
      { name: 'personality', type: 'string' },
      { name: 'tools', type: 'array' },
      { name: 'channels', type: 'array' },
    ],
  },
  {
    id: 'session',
    title: 'SESSION',
    accent: 'Conversation run',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'familiar_id', type: 'string' },
      { name: 'status', type: 'string' },
      { name: 'channel', type: 'string' },
    ],
  },
  {
    id: 'memory',
    title: 'MEMORY',
    accent: 'Stored context',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'familiar_id', type: 'string' },
      { name: 'kind', type: 'string' },
      { name: 'content', type: 'string' },
    ],
  },
];

function SchemaCard({ entity }: { entity: Entity }) {
  return (
    <section className={styles.card} data-entity={entity.id} aria-labelledby={`${entity.id}-schema-title`}>
      <div className={styles.cardHeader}>
        <div>
          <h3 id={`${entity.id}-schema-title`}>{entity.title}</h3>
          <p>{entity.accent}</p>
        </div>
        <span>{entity.fields.length}</span>
      </div>
      <dl className={styles.fields}>
        {entity.fields.map((field) => (
          <div className={styles.field} key={field.name}>
            <dt>{field.name}</dt>
            <dd>{field.type}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function FamiliarSchemaDiagram() {
  const [harness, familiar, session, memory] = entities;

  return (
    <figure className={styles.figure} aria-label="Harness, familiar, session, and memory relationship schema">
      <div className={styles.frame}>
        <div className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Data model</span>
            <p className={styles.title}>Familiar-Harness Relationship</p>
          </div>
          <div className={styles.legend} aria-hidden="true">
            <span>one</span>
            <span>many</span>
          </div>
        </div>

        <div className={styles.canvas}>
          <svg className={styles.lines} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <marker id="schema-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M0 0 L8 4 L0 8 Z" />
              </marker>
            </defs>
            <path d="M50 17 C50 25 50 33 50 41" />
            <path d="M45 61 C31 66 24 75 21 87" />
            <path d="M55 61 C69 66 76 75 79 87" />
          </svg>

          <span className={`${styles.relationship} ${styles.powers}`}>powers</span>
          <span className={`${styles.relationship} ${styles.has}`}>has</span>
          <span className={`${styles.relationship} ${styles.stores}`}>stores</span>

          <SchemaCard entity={harness} />
          <SchemaCard entity={familiar} />
          <SchemaCard entity={session} />
          <SchemaCard entity={memory} />
        </div>
      </div>
    </figure>
  );
}
