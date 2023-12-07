import { clsx } from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';
import * as reactSVG from '@site/static/img/undraw_docusaurus_react.svg';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: JSX.Element;
};

const FeatureList: Array<FeatureItem> = [
  {
    title: 'Powered by React',
    Svg: reactSVG.default,
    description: (
      <>
        Extend or customize your website layout by reusing React. Docusaurus can be extended while reusing the same
        header and footer.
      </>
    ),
    // TODO: add more info here
  },
];

function Feature({ title, Svg, description }: FeatureItem): JSX.Element {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
