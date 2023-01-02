import React from 'react';

// COMPONENTS
import ModalRoot from './ModalRoot';
import { TextInput } from '../InputComponents';
import Button from '../Button/Button';
import styles from './styles.module.scss';

const renderVoteButton = (vote) => (vote === 'Aye' ? <Button green medium type="submit">Vote Aye</Button> : <Button red medium type="submit">Vote Nay</Button>);

function VoteOnReferendumModal({
  // eslint-disable-next-line react/prop-types,max-len
  closeModal, handleSubmit, register, modalShown, setModalShown, onSubmitSecond, onSubmitVote, voteType, referendumInfo,
}) {
  return (
    <>
      { modalShown === 1 && (
      <form
        className={styles.getCitizenshipModal}
        onSubmit={handleSubmit(onSubmitVote)}
      >
        <div className={styles.h3}>{referendumInfo.name}</div>
        <div className={styles.title}>Referendum Index</div>
        <TextInput
          register={register}
          name="referendumIndex"
          placeholder="referendumIndex"
          value={referendumInfo.referendumIndex}
        />

        <div className={styles.buttonWrapper}>
          <Button
            medium
            onClick={closeModal}
          >
            Cancel
          </Button>
          {renderVoteButton(voteType)}
        </div>
      </form>
      )}
      { modalShown === 2 && (
      <form
        className={styles.getCitizenshipModal}
        onSubmit={handleSubmit(onSubmitSecond)}
      >
        <div className={styles.h3}>{referendumInfo.name}</div>
        <div className={styles.title}>Index of the proposal</div>
        <TextInput
          register={register}
          name="proposalIndex"
          placeholder={referendumInfo.proposalIndex}
          value={referendumInfo.proposalIndex}
        />

        <div className={styles.buttonWrapper}>
          <Button
            medium
            onClick={closeModal}
          >
            Cancel
          </Button>
          <Button
            primary
            medium
            type="submit"
          >
            Endorse
          </Button>
        </div>
      </form>
      )}
    </>
  );
}

function VoteOnReferendumModalWrapper(props) {
  return (
    <ModalRoot>
      <VoteOnReferendumModal {...props} />
    </ModalRoot>
  );
}

export default VoteOnReferendumModalWrapper;
