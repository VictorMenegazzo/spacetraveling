/* eslint-disable react/no-danger */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { useMemo } from 'react';

import { GetStaticPaths, GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import Link from 'next/link';

import { format } from 'date-fns';

import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';

import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';

import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import Comments from '../../components/Comments';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  preview: boolean;
  navigation: {
    prevPost: {
      uid: string;
      data: {
        title: string;
      };
    }[];
    nextPost: {
      uid: string;
      data: {
        title: string;
      };
    }[];
  };
}

export default function Post({ post, preview, navigation }: PostProps) {
  const router = useRouter();

  const estimatedReadTime = useMemo(() => {
    const wordsPerMinute = 200;

    const contentWords = post.data.content.reduce(
      (summedContents, currentContent) => {
        const headingWords = currentContent.heading.split(/\s/g).length;
        const bodyWords = currentContent.body.reduce(
          (summedBodies, currentBody) => {
            const textWords = currentBody.text.split(/\s/g).length;

            return summedBodies + textWords;
          },
          0
        );

        return summedContents + headingWords + bodyWords;
      },
      0
    );

    const minutes = contentWords / wordsPerMinute;
    const readTime = Math.ceil(minutes);

    return readTime;
  }, [post]);

  return (
    <>
      <Header />
      <main className={styles.container}>
        <div className={styles.banner}>
          <img src={post.data.banner.url} alt={post.data.title} />
        </div>
        <article className={`${commonStyles.commonStyles} ${styles.post}`}>
          <h1>{router.isFallback ? 'Carregando...' : post.data.title}</h1>
          <div className={styles.postInfos}>
            <div>
              <time>
                <FiCalendar size={20} />
                <span>
                  {format(
                    new Date(post.first_publication_date),
                    'dd MMM yyyy',
                    {
                      locale: ptBR,
                    }
                  )}
                </span>
              </time>
              <div>
                <FiUser size={20} />
                <span>{post.data.author}</span>
              </div>
              <div>
                <FiClock size={20} />
                <span>{estimatedReadTime} min</span>
              </div>
            </div>
            <i>
              * editado em{' '}
              {format(
                new Date(post.last_publication_date),
                "dd MMM yyyy', às' HH:mm",
                {
                  locale: ptBR,
                }
              )}
            </i>
          </div>
          <div className={styles.content}>
            {post.data.content.map(content => (
              <div key={content.heading}>
                <h2>{content.heading}</h2>
                <div
                  className={`${styles.postContent} ${styles.previewContent}`}
                  dangerouslySetInnerHTML={{
                    __html: RichText.asHtml(content.body),
                  }}
                />
              </div>
            ))}
          </div>
        </article>
        <footer className={`${commonStyles.commonStyles} ${styles.footer}`}>
          <div className={styles.otherPages}>
            {navigation?.prevPost.length > 0 && (
              <Link href={`/post/${navigation?.prevPost[0].uid}`}>
                <a className={styles.prevPost}>
                  <span>{navigation?.prevPost[0].data.title}</span>
                  <strong>Post anterior</strong>
                </a>
              </Link>
            )}
            {navigation?.nextPost.length > 0 && (
              <Link href={`/post/${navigation?.nextPost[0].uid}`}>
                <a className={styles.nextPost}>
                  <span>{navigation?.nextPost[0].data.title}</span>
                  <strong>Próximo post</strong>
                </a>
              </Link>
            )}
          </div>
          <Comments />
          {preview && (
            <aside className={styles.exitPreviewMode}>
              <Link href="/api/exit-preview">
                <a>Sair do modo Preview</a>
              </Link>
            </aside>
          )}
        </footer>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'post')],
    {
      pageSize: 5,
    }
  );

  const paths = posts.results.map(post => ({
    params: {
      slug: post.uid,
    },
  }));

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('post', String(slug), {
    ref: previewData?.ref ?? null,
  });

  const prevPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'post')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date]',
    }
  );

  const nextPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'post')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.last_publication_date desc]',
    }
  );

  return {
    props: {
      post: response,
      preview,
      navigation: {
        prevPost: prevPost?.results,
        nextPost: nextPost?.results,
      },
    },
  };
};
